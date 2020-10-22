pragma solidity >=0.4.24 <0.6.0;


contract Multisender {

  event Success();

  function multisend(address payable[] calldata _receivers) external payable {
    uint256 receiversLength = _receivers.length;
    require(receiversLength != 0, "receivers are not defined");
    uint256 amount = address(this).balance / receiversLength;
    for (uint256 i = 0; i < receiversLength; i++) {
      _receivers[i].transfer(amount);
    }
    emit Success();
  }

}
